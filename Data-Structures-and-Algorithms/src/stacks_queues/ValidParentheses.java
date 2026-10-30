package stacks_queues;

import java.util.Stack;

public class ValidParentheses {

    /**
     * Determines whether brackets are properly matched.
     *
     * Time Complexity: O(n)
     * Space Complexity: O(n)
     */
    public static boolean isValid(String input) {

        Stack<Character> stack = new Stack<>();

        for (char character : input.toCharArray()) {

            if (character == '(' ||
                character == '{' ||
                character == '[') {

                stack.push(character);

            } else {

                if (stack.isEmpty()) {
                    return false;
                }

                char opening = stack.pop();

                if ((character == ')' && opening != '(') ||
                    (character == '}' && opening != '{') ||
                    (character == ']' && opening != '[')) {

                    return false;
                }
            }
        }

        return stack.isEmpty();
    }

    public static void main(String[] args) {

        System.out.println(isValid("{[()]}")); // true
        System.out.println(isValid("{[(])}")); // false
        System.out.println(isValid("((("));    // false
    }
}