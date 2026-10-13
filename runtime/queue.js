"use strict";

// Bounded FIFO job queue. Runs at most `maxConcurrency` jobs and rejects new
// jobs once `maxQueueLength` jobs are waiting.

class QueueFullError extends Error {
  constructor(maxQueueLength) {
    super(`Queue is full (${maxQueueLength} waiting). Try again later.`);
    this.code = "queue_full";
  }
}

const createJobQueue = ({ maxConcurrency, maxQueueLength }) => {
  const waiting = [];
  let running = 0;

  const pump = () => {
    while (running < maxConcurrency && waiting.length > 0) {
      const job = waiting.shift();
      running += 1;
      Promise.resolve()
        .then(job.run)
        .then(job.resolve, job.reject)
        .finally(() => {
          running -= 1;
          pump();
        });
    }
  };

  const enqueue = (run) => {
    if (waiting.length >= maxQueueLength) {
      return Promise.reject(new QueueFullError(maxQueueLength));
    }
    return new Promise((resolve, reject) => {
      waiting.push({ run, resolve, reject });
      pump();
    });
  };

  return {
    enqueue,
    stats: () => ({ running, waiting: waiting.length, maxConcurrency, maxQueueLength }),
  };
};

module.exports = { QueueFullError, createJobQueue };
