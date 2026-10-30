# Binary Search Tree (BST)

## Overview
This implementation creates a Binary Search Tree (BST) that supports insertion, searching, deletion, and tree traversal.

A Binary Search Tree is a hierarchical data structure where each node contains a value and references to its left and right children.

For this implementation:
- Values smaller than a node are placed in its left subtree.
- Values larger than a node are placed in its right subtree.
- Duplicate values are ignored.

## Features

### Insertion
Adds a new value while maintaining the BST ordering property.

### Searching
Searches for a target value by comparing it against each visited node and choosing the appropriate subtree.

### Deletion
Removes a value while maintaining the BST structure. Supports three deletion cases:
1. Node has no children.
2. Node has one child.
3. Node has two children.

For a node with two children, the implementation replaces its value with the smallest value in its right subtree.

### Tree Traversals
Supports three traversal methods:

- **Inorder:** Left → Root → Right
- **Preorder:** Root → Left → Right
- **Postorder:** Left → Right → Root

## Example

**Inserted Values:**
```java
50, 30, 70, 20, 40, 60, 80
```

**Tree Structure:**
```text
        50
       /  \
      30   70
     / \   / \
    20 40 60 80
```

**Inorder Traversal:**
```text
[20, 30, 40, 50, 60, 70, 80]
```

**Preorder Traversal:**
```text
[50, 30, 20, 40, 70, 60, 80]
```

**Postorder Traversal:**
```text
[20, 40, 30, 60, 80, 70, 50]
```

## Complexity Analysis

Let n represent the number of nodes in the tree.

| Operation | Average Case | Worst Case |
|---|---|---|
| Insertion | O(log n) | O(n) |
| Searching | O(log n) | O(n) |
| Deletion | O(log n) | O(n) |
| Traversal | O(n) | O(n) |

The average-case performance assumes a reasonably balanced tree. An unbalanced BST can behave similarly to a linked list, resulting in O(n) search, insertion, and deletion times.

