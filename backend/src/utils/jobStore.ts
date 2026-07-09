import { EventEmitter } from "events";
import { Logger } from "./logger.js";

export interface JobState {
  emitter: EventEmitter;
  totalRows: number;
  done: boolean;
  result?: any;
  error?: string;
}

class JobStore {
  private jobs = new Map<string, JobState>();

  /**
   * Register a new import job and return its initial state.
   * Auto-cleans up after 10 minutes to prevent memory leaks.
   */
  create(jobId: string, totalRows: number): JobState {
    const state: JobState = {
      emitter: new EventEmitter(),
      totalRows,
      done: false,
    };
    this.jobs.set(jobId, state);

    setTimeout(() => {
      this.jobs.delete(jobId);
      Logger.debug(`Job ${jobId} expired from store.`, "JobStore");
    }, 10 * 60 * 1000);

    Logger.info(`Job registered: ${jobId} | ${totalRows} rows pending.`, "JobStore");
    return state;
  }

  get(jobId: string): JobState | undefined {
    return this.jobs.get(jobId);
  }

  /** Emit a batch progress tick. */
  emitProgress(jobId: string, batchesDone: number, batchesTotal: number): void {
    const job = this.jobs.get(jobId);
    if (job && !job.done) {
      job.emitter.emit("progress", { batchesDone, batchesTotal });
    }
  }

  /** Mark job complete and emit the final result. */
  emitDone(jobId: string, result: any): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.done = true;
    job.result = result;
    job.emitter.emit("done", result);
    Logger.info(`Job ${jobId} completed successfully.`, "JobStore");
  }

  /** Mark job failed and emit the error message. */
  emitError(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.done = true;
    job.error = error;
    job.emitter.emit("error", error);
    Logger.error(`Job ${jobId} failed: ${error}`, "JobStore");
  }
}

export const jobStore = new JobStore();
