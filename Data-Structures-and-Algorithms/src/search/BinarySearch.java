package search;

public class BinarySearch {

    /**
     * Searches for a target value in a sorted array.
     *
     * @param nums Sorted integer array
     * @param target Value to locate
     * @return Index of target, or -1 if not found
     *
     * Time Complexity: O(log n)
     * Space Complexity: O(1)
     */
    public static int search(int[] nums, int target) {
        int left, right, middle;


        left = 0;
        right = nums.length - 1;

        while (left <= right) {

            middle = left + (right - left) / 2;

            if (nums[middle] == target) {
                return middle;
            }

            if (nums[middle] < target) {
                left = middle + 1;
            } else {
                right = middle - 1;
            }
        }

        return -1;
    }

    public static void main(String[] args) {

        int[] nums = {1, 3, 5, 7, 9, 11, 13};

        System.out.println(search(nums, 7));  // 3
        System.out.println(search(nums, 4));  // -1
    }
}

