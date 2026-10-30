# Merge Sort

## Overview
This implementation uses the Merge Sort algorithm to sort an integer array in ascending order.

Merge Sort follows the Divide and Conquer approach by repeatedly splitting an array into smaller sections, sorting those sections, and merging them back together.

## How It Works
1. Divide the array into two halves.
2. Recursively split each half until individual elements remain.
3. Compare elements from each half.
4. Merge the elements back together in sorted order.
5. Continue until the entire array has been reconstructed.

## Example

**Input:**
```java
int[] nums = {38, 27, 43, 3, 9, 82, 10};
```

**Output:**
```text
[3, 9, 10, 27, 38, 43, 82]
```

## Complexity Analysis

| Complexity | Performance |
|---|---|
| Best Case | O(n log n) |
| Average Case | O(n log n) |
| Worst Case | O(n log n) |
| Space | O(n) |

Merge Sort consistently divides the array into smaller sections, resulting in O(n log n) time complexity. It requires additional memory for temporary arrays during merging.

## Advantages
- Consistent performance across different input arrangements.
- Efficient for sorting large datasets.
- Stable sorting algorithm, preserving the relative order of equal elements.

# Quick Sort

## Overview
This implementation uses the Quick Sort algorithm to sort an integer array in ascending order.

Quick Sort follows the Divide and Conquer approach by selecting a pivot element and partitioning the array into smaller sections based on the pivot's value.

## How It Works
1. Select a pivot element from the array.
2. Partition the array so that elements smaller than or equal to the pivot appear to its left.
3. Place the pivot in its correct sorted position.
4. Recursively apply Quick Sort to the left and right partitions.
5. Continue until the array is fully sorted.

This implementation uses the last element as the pivot and the Lomuto partition scheme.

## Example

**Input:**
```java
int[] nums = {10, 7, 8, 9, 1, 5};
```

**Output:**
```text
[1, 5, 7, 8, 9, 10]
```

## Complexity Analysis

| Complexity | Performance |
|---|---|
| Best Case | O(n log n) |
| Average Case | O(n log n) |
| Worst Case | O(n²) |
| Average Space | O(log n) |
| Worst Space | O(n) |

The worst-case performance can occur when the pivot repeatedly produces highly unbalanced partitions, such as with certain already-sorted inputs.

## Advantages
- Efficient average-case sorting performance.
- Sorts the array in place.
- Requires relatively little additional memory on average.

