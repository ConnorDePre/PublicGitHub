# Two Sum

## Overview
This implementation solves the Two Sum problem using a HashMap. Given an array of integers and a target value, the algorithm finds two numbers whose sum equals the target and returns their indices.

## How It Works
1. Create a HashMap to store previously visited numbers and their indices.
2. Iterate through the input array.
3. Calculate the complement by subtracting the current number from the target.
4. Check whether the complement exists in the HashMap.
5. If it exists, return the indices of the two numbers.
6. Otherwise, store the current number and its index in the HashMap.

## Example

**Input:**
```java
int[] nums = {2, 7, 11, 15};
int target = 9;
```

**Output:**
```text
[0, 1]
```

**Explanation:** The numbers 2 and 7 add up to 9. Their indices are 0 and 1.

## Complexity Analysis

| Complexity | Performance |
|---|---|
| Time | O(n) |
| Space | O(n) |

The algorithm traverses the array once while using a HashMap for efficient lookups.