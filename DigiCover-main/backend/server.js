import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());

//setup AWS S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// Setup AWS Client
const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const docClient = DynamoDBDocumentClient.from(client);
const BOOKS_BUCKET = process.env.BUCKET_NAME || "digicover-books";
const BOOKS_PREFIX = process.env.BOOKS_PREFIX || "books/";
const USER_ACTIVITY_TABLE = process.env.USER_ACTIVITY_TABLE || "UserActivity";
const PREFERENCE_LOOKBACK_DAYS = Number(process.env.PREFERENCE_LOOKBACK_DAYS || 14);

const FOR_YOU_WEIGHTS = {
    like: 2,
    share: 3,
    save: 2,
    authorPreference: 3,
    tagPreference: 1.5,
    recencyLambda: 0.06,
};

const getLookbackIso = () => {
    const now = Date.now();
    const lookbackMs = PREFERENCE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    return new Date(now - lookbackMs).toISOString();
};

const recencyPenalty = (publishedDate) => {
    if (!publishedDate) return 1;
    const publishedAt = new Date(publishedDate).getTime();
    if (Number.isNaN(publishedAt)) return 1;
    const ageHours = Math.max(0, (Date.now() - publishedAt) / (1000 * 60 * 60));
    return Math.exp(-FOR_YOU_WEIGHTS.recencyLambda * ageHours);
};

const fetchUserPreferences = async (username) => {
    const params = {
        TableName: USER_ACTIVITY_TABLE,
        KeyConditionExpression: "pk = :pk AND sk >= :start",
        ExpressionAttributeValues: {
            ":pk": `USER#${username.toLowerCase()}`,
            ":start": `TS#${getLookbackIso()}`,
        },
    };

    const result = await docClient.send(new QueryCommand(params));
    const authorCounts = {};
    const tagCounts = {};

    for (const activity of result.Items || []) {
        const author = activity.author?.toLowerCase?.();
        if (author) {
            authorCounts[author] = (authorCounts[author] || 0) + 1;
        }

        if (Array.isArray(activity.tags)) {
            for (const rawTag of activity.tags) {
                const tag = rawTag?.toLowerCase?.();
                if (!tag) continue;
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
        }
    }

    return { authorCounts, tagCounts };
};

const fetchAllBooks = async () => {
    const listParams = {
        Bucket: BOOKS_BUCKET,
        Prefix: BOOKS_PREFIX,
    };

    const listed = await s3Client.send(new ListObjectsV2Command(listParams));
    if (!listed.Contents) return [];

    const books = [];
    for (const file of listed.Contents) {
        if (!file.Key || file.Key === BOOKS_PREFIX || !file.Key.endsWith(".json")) continue;

        const data = await s3Client.send(new GetObjectCommand({
            Bucket: BOOKS_BUCKET,
            Key: file.Key,
        }));

        const body = await data.Body.transformToString();
        if (!body) continue;

        try {
            books.push(JSON.parse(body));
        } catch (error) {
            console.warn(`Skipping invalid JSON: ${file.Key}`, error);
        }
    }

    return books;
};

// the Login Route
    app.post('/api/login', async (req, res) => {
        const { email, password } = req.body;

        const params = {
            TableName: "Users",
            Key: { username: email } // email
        };

        try {
            const { Item } = await docClient.send(new GetCommand(params));
            
            if (!Item) {
                return res.status(401).json({ message: "User not found" });
            }

            // compare hashed password
            const isMatch = await bcrypt.compare(password, Item.password);

            if (isMatch) {
                res.status(200).json({
                    message: "Success",
                    user: {
                        username: Item.username,
                        firstName: Item.firstName || "",
                        lastName: Item.lastName || "",
                    },
                });
            } else {
                res.status(401).json({ message: "Wrong password" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server error" });
        }
    });

// the Register Route
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    try {
        // Check if the user already exists in DynamoDB
        const checkParams = {
            TableName: "Users",
            Key: { username: email } // Using email as the unique 'username' key
        };
        const { Item } = await docClient.send(new GetCommand(checkParams));
        
        if (Item) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash the password before saving
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Save the new user to DynamoDB
        const putParams = {
            TableName: "Users",
            Item: {
                username: email, 
                firstName: firstName,
                lastName: lastName,
                password: hashedPassword, // Store the HASH, never the plain password
                createdAt: new Date().toISOString()
            }
        };

        await docClient.send(new PutCommand(putParams));
        res.status(201).json({ message: "User created successfully!" });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "Server error during registration" });
    }
});

// the publish route
app.post('/api/publish', async (req, res) => {
    const { bookId, title, author, pages, description, social, genre } = req.body;
    const bucketName = process.env.BUCKET_NAME || "digicover-books";

    if (!bookId || !title || !author || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ message: "Missing required publish fields" });
    }

    const bookData = {
        bookId,
        metadata: {
            title,
            author: {
                name: author,
                bio: "N/A",
                id: "author-002"
            },
            genre: (typeof genre === 'string' && genre.trim()) ? genre.trim() : "Other",
            publishedDate: new Date().toISOString(),
            coverImage: "/assets/images/default-book.png",
            description
        },
        content: {
            totalPages: pages.length,
            pages
        },
        social: social || { shares: 0, likes: 0, tags: [] },

    };

    const fileName = `${bookId}-${title.toLowerCase().replace(/ /g, '-')}.json`;

    const s3Params = {
        Bucket: BOOKS_BUCKET, 
        Key: `${BOOKS_PREFIX}${fileName}`,
        Body: JSON.stringify(bookData),
        ContentType: "application/json"
    };

    console.log("Uploading to S3 with params:", s3Params);

    try {
        await s3Client.send(new PutObjectCommand(s3Params));
        res.status(200).json({ message: "Book published successfully!", url: fileName });
    } catch (error) {
        console.error("S3 Upload Error:", error);
        res.status(500).json({ message: "Failed to upload to S3" });
    }
});

// the fetch books route
app.get('/api/books', async (req, res) => {
    try {
        const rawBooks = await fetchAllBooks();
        const books = rawBooks.map((json) => ({
            bookId: json.bookId,
            title: json.metadata?.title,
            author: json.metadata?.author?.name,
            coverImage: json.metadata?.coverImage,
            likes: json.social?.likes || 0,
            genre: json.metadata?.genre || "Other",
        }));

        res.json(books);
        const bucketName = process.env.BUCKET_NAME || "digicover-books";

        const listParams = {
            Bucket: bucketName,
            Prefix: "books/"
        };

        const listed = await s3Client.send(new ListObjectsV2Command(listParams));

        if (!listed.Contents) {
            return res.json([]);
        }

    } catch (error) {
        console.error("Fetch books error:", error);
        res.status(500).json({ message: "Failed to fetch books" });
    }
});

// books search
app.get('/api/books/search', async (req, res) => {
    const q = (req.query.q?.toString() || "").trim().toLowerCase();
    const genreParam = (req.query.genre?.toString() || "").trim();
    const genreFilter = genreParam && genreParam.toLowerCase() !== "all"
        ? genreParam.toLowerCase()
        : null;

    try {
        const rawBooks = await fetchAllBooks();

        const filtered = rawBooks
            .filter((json) => !!json.bookId)
            .filter((json) => {
                if (!genreFilter) return true;
                const g = (json.metadata?.genre || "").toLowerCase();
                return g === genreFilter;
            })
            .filter((json) => {
                if (!q) return true;
                const title = (json.metadata?.title || "").toLowerCase();
                const author = (json.metadata?.author?.name || "").toLowerCase();
                const description = (json.metadata?.description || "").toLowerCase();
                return (
                    title.includes(q) ||
                    author.includes(q) ||
                    description.includes(q)
                );
            })
            .map((json) => ({
                bookId: json.bookId,
                title: json.metadata?.title || "Untitled Book",
                author: json.metadata?.author?.name || "Unknown Author",
                coverImage: json.metadata?.coverImage || "",
                likes: Number(json.social?.likes || 0),
                genre: json.metadata?.genre || "Other",
            }))
            .sort((a, b) => a.title.localeCompare(b.title));

        res.json(filtered);
    } catch (error) {
        console.error("Search books error:", error);
        res.status(500).json({ message: "Failed to search books" });
    }
});

app.get('/api/feed/for-you', async (req, res) => {
    const username = req.query.username?.toString()?.trim()?.toLowerCase();
    const limitRaw = Number(req.query.limit || 25);
    const limit = Number.isNaN(limitRaw) ? 25 : Math.min(Math.max(Math.floor(limitRaw), 1), 100);
    const getParams = {
                Bucket: bucketName,
                Key: file.Key
    };

    if (!username) {
        return res.status(400).json({ message: "username query parameter is required" });
    }

    try {
        const [rawBooks, preferences] = await Promise.all([
            fetchAllBooks(),
            fetchUserPreferences(username),
        ]);

        const ranked = rawBooks
            .filter((book) => book.bookId)
            .map((book) => {
                const likes = Number(book.social?.likes || 0);
                const shares = Number(book.social?.shares || 0);
                const saves = Number(book.social?.saves || 0);
                const engagementScore = (likes * FOR_YOU_WEIGHTS.like) + (shares * FOR_YOU_WEIGHTS.share) + (saves * FOR_YOU_WEIGHTS.save);

                const author = book.metadata?.author?.name || "Unknown Author";
                const authorBoost = (preferences.authorCounts[author.toLowerCase()] || 0) * FOR_YOU_WEIGHTS.authorPreference;

                let tagBoost = 0;
                for (const tag of book.social?.tags || []) {
                    tagBoost += (preferences.tagCounts[String(tag).toLowerCase()] || 0) * FOR_YOU_WEIGHTS.tagPreference;
                }

                const finalScore = (engagementScore * recencyPenalty(book.metadata?.publishedDate)) + authorBoost + tagBoost;

                return {
                    bookId: book.bookId,
                    title: book.metadata?.title || "Untitled Book",
                    author,
                    coverImage: book.metadata?.coverImage || "",
                    likes,
                    score: Number(finalScore.toFixed(4)),
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        res.status(200).json(ranked);
    } catch (error) {
        console.error("For You feed error:", error);
        res.status(500).json({ message: "Failed to generate For You feed" });
    }
});

app.post('/api/activity', async (req, res) => {
    const { username, bookId, eventType, author, tags } = req.body;
    const allowed = new Set(["view", "like"]);

    if (!username || !bookId || !eventType) {
        return res.status(400).json({ message: "username, bookId, and eventType are required" });
    }
    if (!allowed.has(eventType)) {
        return res.status(400).json({ message: "eventType must be one of: view, like" });
    }

    const createdAt = new Date().toISOString();
    const item = {
        pk: `USER#${String(username).toLowerCase()}`,
        sk: `TS#${createdAt}#BOOK#${bookId}#${eventType}`,
        username: String(username).toLowerCase(),
        bookId,
        eventType,
        author: author || "",
        tags: Array.isArray(tags) ? tags : [],
        createdAt,
    };

    try {
        await docClient.send(new PutCommand({
            TableName: USER_ACTIVITY_TABLE,
            Item: item,
        }));
        res.status(201).json({ message: "Recorded" });
    } catch (error) {
        console.error("Record activity error:", error);
        res.status(500).json({ message: "Failed to record activity" });
    }
});

app.get('/api/books/:bookId/:title', async (req, res) => {
    const { bookId, title } = req.params;
    const bucketName = process.env.BUCKET_NAME || "digicover-books";

    const key = `${BOOKS_PREFIX}${bookId}-${title}.json`.toLowerCase();

    const params = {
        Bucket: BOOKS_BUCKET,
        Key: key
    };

    try {

        const data = await s3Client.send(new GetObjectCommand(params));
        const body = await data.Body.transformToString();

        const json = JSON.parse(body);

        res.json(json);

    } catch (error) {
        console.error("Fetch book error:", error);
        res.status(404).json({ message: "Book not found" });
    }
});

// --- Likes ---

// Resolve the S3 key for a book. Prefer the canonical "${bookId}-${title}.json"
// format used by publish; fall back to listing by bookId prefix if title is missing.
const resolveBookKey = async (bookId, title) => {
    if (title) {
        const canonical = `${BOOKS_PREFIX}${bookId}-${title.toLowerCase().replace(/ /g, '-')}.json`;
        try {
            await s3Client.send(new GetObjectCommand({ Bucket: BOOKS_BUCKET, Key: canonical }));
            return canonical;
        } catch {
            // fall through to list
        }
    }

    const listed = await s3Client.send(new ListObjectsV2Command({
        Bucket: BOOKS_BUCKET,
        Prefix: `${BOOKS_PREFIX}${bookId}-`,
    }));

    const match = listed.Contents?.find((obj) => obj.Key && obj.Key.endsWith('.json'));
    return match?.Key || null;
};

// Read-modify-write the book JSON in S3 to adjust social.likes by delta.
// Note: not atomic; concurrent likes from different users could undercount by 1
// in rare cases, which is acceptable at current scale.
const adjustBookLikes = async (key, delta) => {
    const current = await s3Client.send(new GetObjectCommand({ Bucket: BOOKS_BUCKET, Key: key }));
    const body = await current.Body.transformToString();
    const json = JSON.parse(body);

    const existing = Number(json.social?.likes || 0);
    const nextLikes = Math.max(0, existing + delta);

    json.social = {
        ...(json.social || { shares: 0, likes: 0, tags: [] }),
        likes: nextLikes,
    };

    await s3Client.send(new PutObjectCommand({
        Bucket: BOOKS_BUCKET,
        Key: key,
        Body: JSON.stringify(json),
        ContentType: 'application/json',
    }));

    return { likes: nextLikes, book: json };
};

app.post('/api/books/:bookId/like', async (req, res) => {
    const { bookId } = req.params;
    const { username, like, title, author, coverImage, tags } = req.body;

    if (!username || !bookId || typeof like !== 'boolean') {
        return res.status(400).json({ message: "username, bookId, and like (boolean) are required" });
    }

    const normalizedUsername = String(username).toLowerCase();
    const pk = `USER#${normalizedUsername}`;
    const sk = `LIKE#${bookId}`;

    try {
        const key = await resolveBookKey(bookId, title);
        if (!key) {
            return res.status(404).json({ message: "Book not found" });
        }

        if (like) {
            try {
                await docClient.send(new PutCommand({
                    TableName: USER_ACTIVITY_TABLE,
                    Item: {
                        pk,
                        sk,
                        username: normalizedUsername,
                        bookId,
                        eventType: "like",
                        title: title || "",
                        author: author || "",
                        coverImage: coverImage || "",
                        tags: Array.isArray(tags) ? tags : [],
                        createdAt: new Date().toISOString(),
                    },
                    ConditionExpression: "attribute_not_exists(pk)",
                }));

                const { likes } = await adjustBookLikes(key, +1);
                return res.status(200).json({ liked: true, likes });
            } catch (error) {
                if (error?.name === 'ConditionalCheckFailedException') {
                    const current = await s3Client.send(new GetObjectCommand({ Bucket: BOOKS_BUCKET, Key: key }));
                    const body = await current.Body.transformToString();
                    const json = JSON.parse(body);
                    return res.status(200).json({ liked: true, likes: Number(json.social?.likes || 0) });
                }
                throw error;
            }
        } else {
            const existing = await docClient.send(new GetCommand({
                TableName: USER_ACTIVITY_TABLE,
                Key: { pk, sk },
            }));

            if (!existing.Item) {
                const current = await s3Client.send(new GetObjectCommand({ Bucket: BOOKS_BUCKET, Key: key }));
                const body = await current.Body.transformToString();
                const json = JSON.parse(body);
                return res.status(200).json({ liked: false, likes: Number(json.social?.likes || 0) });
            }

            await docClient.send(new DeleteCommand({
                TableName: USER_ACTIVITY_TABLE,
                Key: { pk, sk },
            }));

            const { likes } = await adjustBookLikes(key, -1);
            return res.status(200).json({ liked: false, likes });
        }
    } catch (error) {
        console.error("Like error:", error);
        res.status(500).json({ message: "Failed to update like" });
    }
});

app.get('/api/books/:bookId/like-status', async (req, res) => {
    const { bookId } = req.params;
    const username = req.query.username?.toString()?.trim()?.toLowerCase();
    const normalizedBookId = String(bookId || "").trim();

    if (!username || !normalizedBookId) {
        console.warn("Like status bad request", { username, bookId });
        return res.status(400).json({ message: "username and bookId are required" });
    }

    try {
        const result = await docClient.send(new GetCommand({
            TableName: USER_ACTIVITY_TABLE,
            Key: { pk: `USER#${username}`, sk: `LIKE#${normalizedBookId}` },
        }));

        res.json({ liked: !!result.Item });
    } catch (error) {
        console.error("Like status error:", error);
        res.status(500).json({ message: "Failed to fetch like status" });
    }
});

app.get('/api/users/:username/likes', async (req, res) => {
    const username = req.params.username?.toString()?.trim()?.toLowerCase();

    if (!username) {
        return res.status(400).json({ message: "username is required" });
    }

    try {
        const result = await docClient.send(new QueryCommand({
            TableName: USER_ACTIVITY_TABLE,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
            ExpressionAttributeValues: {
                ":pk": `USER#${username}`,
                ":prefix": "LIKE#",
            },
        }));

        const likedBooks = (result.Items || []).map((item) => ({
            bookId: item.bookId,
            title: item.title || "Untitled Book",
            author: item.author || "",
            coverImage: item.coverImage || "",
            likes: 0,
        }));

        res.json(likedBooks);
    } catch (error) {
        console.error("Fetch user likes error:", error);
        res.status(500).json({ message: "Failed to fetch liked books" });
    }
});

// --- Saves (Personal Library) ---

app.post('/api/books/:bookId/save', async (req, res) => {
    const { bookId } = req.params;
    const { username, save, title, author, coverImage, tags } = req.body;

    if (!username || !bookId || typeof save !== 'boolean') {
        return res.status(400).json({ message: "username, bookId, and save (boolean) are required" });
    }

    const normalizedUsername = String(username).toLowerCase();
    const pk = `USER#${normalizedUsername}`;
    const sk = `SAVE#${bookId}`;

    try {
        const key = await resolveBookKey(bookId, title);
        if (!key) {
            return res.status(404).json({ message: "Book not found" });
        }

        if (save) {
            try {
                await docClient.send(new PutCommand({
                    TableName: USER_ACTIVITY_TABLE,
                    Item: {
                        pk,
                        sk,
                        username: normalizedUsername,
                        bookId,
                        eventType: "save",
                        title: title || "",
                        author: author || "",
                        coverImage: coverImage || "",
                        tags: Array.isArray(tags) ? tags : [],
                        createdAt: new Date().toISOString(),
                    },
                    ConditionExpression: "attribute_not_exists(pk)",
                }));

                return res.status(200).json({ saved: true });
            } catch (error) {
                if (error?.name === 'ConditionalCheckFailedException') {
                    return res.status(200).json({ saved: true });
                }
                throw error;
            }
        } else {
            const existing = await docClient.send(new GetCommand({
                TableName: USER_ACTIVITY_TABLE,
                Key: { pk, sk },
            }));

            if (!existing.Item) {
                return res.status(200).json({ saved: false });
            }

            await docClient.send(new DeleteCommand({
                TableName: USER_ACTIVITY_TABLE,
                Key: { pk, sk },
            }));

            return res.status(200).json({ saved: false });
        }
    } catch (error) {
        console.error("Save error:", error);
        res.status(500).json({ message: "Failed to update save" });
    }
});

app.get('/api/books/:bookId/save-status', async (req, res) => {
    const { bookId } = req.params;
    const username = req.query.username?.toString()?.trim()?.toLowerCase();
    const normalizedBookId = String(bookId || "").trim();

    if (!username || !normalizedBookId) {
        console.warn("Save status bad request", { username, bookId });
        return res.status(400).json({ message: "username and bookId are required" });
    }

    try {
        const result = await docClient.send(new GetCommand({
            TableName: USER_ACTIVITY_TABLE,
            Key: { pk: `USER#${username}`, sk: `SAVE#${normalizedBookId}` },
        }));

        res.json({ saved: !!result.Item });
    } catch (error) {
        console.error("Save status error:", error);
        res.status(500).json({ message: "Failed to fetch save status" });
    }
});

app.get('/api/users/:username/saves', async (req, res) => {
    const username = req.params.username?.toString()?.trim()?.toLowerCase();

    if (!username) {
        return res.status(400).json({ message: "username is required" });
    }

    try {
        const result = await docClient.send(new QueryCommand({
            TableName: USER_ACTIVITY_TABLE,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
            ExpressionAttributeValues: {
                ":pk": `USER#${username}`,
                ":prefix": "SAVE#",
            },
        }));

        const savedBooks = (result.Items || []).map((item) => ({
            bookId: item.bookId,
            title: item.title || "Untitled Book",
            author: item.author || "",
            coverImage: item.coverImage || "",
            savedAt: item.createdAt || new Date().toISOString(),
        }));

        res.json(savedBooks);
    } catch (error) {
        console.error("Fetch user saves error:", error);
        res.status(500).json({ message: "Failed to fetch saved books" });
    }
});

app.get('/test', (req, res) => {
  res.json({ message: "Backend is working" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
