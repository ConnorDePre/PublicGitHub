package arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;

public class TwoSum {

    /**
     * Finds two numbers whose sum equals the target.
     *
     * @param nums Array of integers
     * @param target Desired sum
     * @return Indices of the two numbers, or empty array if none exist
     *
     * Time Complexity: O(n)
     * Space Complexity: O(n)
     */
    public static int[] findTwoSum(int[] nums, int target) {

        Map<Integer, Integer> map = new HashMap<>();

        for (int i = 0; i < nums.length; i++) {

            int complement = target - nums[i];

            if (map.containsKey(complement)) {
                return new int[]{map.get(complement), i};
            }

            map.put(nums[i], i);
        }

        return new int[]{};
    }

    public static void main(String[] args) {

        int[] nums = {2, 7, 11, 15};
        int target = 9;

        int[] result = findTwoSum(nums, target);

        System.out.println("Indices: " + Arrays.toString(result));
        
        target = 34;
        result = findTwoSum(nums, target);

        System.out.println("Indeces: " + Arrays.toString(result));

    }
}