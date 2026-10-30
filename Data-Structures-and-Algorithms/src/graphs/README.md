# Breadth-First Search (BFS)

## Overview
This implementation uses Breadth-First Search to traverse a graph.

BFS explores a graph level by level, visiting all neighboring vertices before moving to the next level. It uses a queue to keep track of which vertices should be visited next.

## How It Works
1. Initialize a queue and a set of visited vertices.
2. Add the starting vertex to both.
3. Remove the first vertex from the queue.
4. Visit each of its unvisited neighbors.
5. Mark each neighbor as visited and add it to the queue.
6. Repeat until the queue is empty.

## Example

**Graph:**
```text
       1
      / \
     2   3
    / \   \
   4   5   6
```

**Starting Vertex:**
```text
1
```

**Output:**
```text
1 2 3 4 5 6
```

**Explanation:** BFS visits vertices in order of their distance from the starting vertex.

## Complexity Analysis

| Complexity | Performance |
|---|---|
| Time | O(V + E) |
| Space | O(V) |

Where:
- V = Number of vertices.
- E = Number of edges.

Each vertex and edge is processed at most a constant number of times.

## Applications
- Finding the shortest path in an unweighted graph.
- Network broadcasting.
- Social network connections.
- Web crawling.
- Graph connectivity analysis.


# Depth-First Search (DFS)

## Overview
This implementation uses Depth-First Search to traverse a graph.

DFS explores as far as possible along one branch before backtracking to explore other branches. This implementation uses recursion and a visited set to track previously visited vertices.

## How It Works
1. Start at the selected vertex.
2. Mark the current vertex as visited.
3. Process or print the current vertex.
4. Iterate through its neighboring vertices.
5. Recursively visit each neighbor that has not already been visited.
6. Backtrack when no unvisited neighbors remain.

## Example

**Graph:**
```text
       1
      / \
     2   3
    / \   \
   4   5   6
```

**Starting Vertex:**
```text
1
```

**Output:**
```text
1 2 4 5 3 6
```

**Explanation:** DFS follows one branch as deeply as possible before returning to explore another branch. The exact traversal order depends on the order in which neighbors are stored.

## Complexity Analysis

| Complexity | Performance |
|---|---|
| Time | O(V + E) |
| Space | O(V) |

Where:
- V = Number of vertices.
- E = Number of edges.

The visited set and recursion stack can each require O(V) space in the worst case.

## Applications
- Detecting cycles in graphs.
- Finding connected components.
- Maze solving.
- Pathfinding.
- Topological sorting (with additional logic).

