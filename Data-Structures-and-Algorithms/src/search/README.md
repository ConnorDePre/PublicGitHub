# Binary Search

## Overview
This implementation uses the Binary Search algorithm to locate a target value within a sorted integer array.

Binary Search repeatedly divides the search range in half, eliminating the portion of the array that cannot contain the target.

## How It Works
1. Initialize two pointers: `left` and `right`.
2. Calculate the middle index of the current search range.
3. Compare the middle element with the target.
4. If they match, return the middle index.
5. If the target is smaller, search the left half.
6. If the target is larger, search the right half.
7. Continue until the target is found or the search range is empty.

## Example

**Input:**
```java
int[] nums = {1, 3, 5, 7, 9, 11};
int target = 7;
```

**Output:**
```text
3
```

**Explanation:** The target value 7 is located at index 3.

## Complexity Analysis

| Complexity | Performance |
|---|---|
| Time | O(log n) |
| Space | O(1) |

The iterative implementation uses constant additional space and eliminates half of the remaining search range during each iteration.

## Requirements
- The input array must be sorted in ascending order.

