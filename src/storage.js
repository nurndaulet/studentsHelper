export const STORAGE_KEY = "@smart-student/v1";
export const BACKUP_KEY = "@smart-student/v1/backup";

function parse(raw) {
  const value = JSON.parse(raw);
  if (
    !value ||
    !Array.isArray(value.lessons) ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.materials)
  ) {
    throw new Error("Invalid student data");
  }
  return value;
}

// Keep the original key so installed users retain their existing records.
export function createStudentStorage(storage) {
  let pending = Promise.resolve();
  return {
    async load() {
      let primary;
      try {
        primary = await storage.getItem(STORAGE_KEY);
        if (primary !== null) return parse(primary);
      } catch (error) {
        const backup = await storage.getItem(BACKUP_KEY);
        if (backup !== null) return parse(backup);
        throw error;
      }
      const backup = await storage.getItem(BACKUP_KEY);
      return backup === null ? null : parse(backup);
    },
    save(value) {
      const raw = JSON.stringify(value);
      const write = pending
        .catch(() => {})
        .then(async () => {
          await storage.setItem(STORAGE_KEY, raw);
          // A backup failure must not misreport a successful primary save as lost.
          try {
            await storage.setItem(BACKUP_KEY, raw);
          } catch {
            /* Primary remains durable. */
          }
        });
      pending = write;
      return write;
    },
  };
}
