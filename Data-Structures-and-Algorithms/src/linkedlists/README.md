# Reverse Linked List

## Overview
This implementation reverses a singly linked list in place by changing the direction of its node references.

Instead of creating an entirely new linked list, the algorithm modifies the existing pointers to reverse the order of the nodes.

## How It Works
1. Initialize three pointers: `previous`, `current`, and `next`.
2. Start at the head of the linked list.
3. Temporarily store the next node.
4. Change the current node's next reference to point to the previous node.
5. Move the previous and current pointers forward.
6. Repeat until all nodes have been reversed.
7. Return the new head of the linked list.

## Example

**Original Linked List:**
```text
1 -> 2 -> 3 -> 4 -> 5 -> null
```

**Reversed Linked List:**
```text
5 -> 4 -> 3 -> 2 -> 1 -> null
```

## Complexity Analysis

| Complexity | Performance |
|---|---|
| Time | O(n) |
| Space | O(1) |

Each node is visited once, and the reversal happens in place without allocating another linked list.

