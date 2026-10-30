# Valid Parentheses

## Overview
This implementation determines whether a string containing parentheses and brackets is valid using a stack.

A string is considered valid when every opening bracket has a corresponding closing bracket in the correct order.

The algorithm supports three types of brackets:
- `()`
- `{}`
- `[]`

## How It Works
1. Initialize an empty stack.
2. Iterate through each character in the input string.
3. If the character is an opening bracket, push it onto the stack.
4. If the character is a closing bracket:
   - Check whether the stack is empty.
   - Pop the most recently added opening bracket.
   - Verify that it matches the closing bracket.
5. If a mismatch occurs, return false.
6. After processing the string, return true only if the stack is empty.

## Example

**Valid Input:**
```text
{[()]}
```

**Output:**
```text
true
```

**Invalid Input:**
```text
{[(])}
```

**Output:**
```text
false
```

**Explanation:** The stack ensures that brackets close in the correct last-in, first-out order.

## Complexity Analysis

| Complexity | Performance |
|---|---|
| Time | O(n) |
| Space | O(n) |

Each character is processed once, and in the worst case, every character could be stored in the stack.

