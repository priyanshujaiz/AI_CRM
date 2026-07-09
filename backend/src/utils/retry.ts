import { Logger } from "./logger.js";

/**
 * Retries an asynchronous function with exponential backoff.
 * 
 * @param fn The function to execute
 * @param retries Number of retries (default: 3)
 * @param delay Initial delay in milliseconds (default: 1000)
 * @param context Optional log context tag
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  context = "Retry"
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    Logger.warn(
      `Attempt failed. Retrying in ${delay}ms... (${retries} attempts remaining).`,
      context,
      error
    );
    
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2, context);
  }
}
