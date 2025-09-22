// tests/utils/TestDatabase.ts
export class TestDatabaseManager {
  async createTestDatabase(scenario: TestScenario): Promise<Database>
  async populateWithFixtures(db: Database, fixtures: Memory[]): Promise<void>
  async snapshotDatabase(db: Database): Promise<DatabaseSnapshot>
  async restoreSnapshot(snapshot: DatabaseSnapshot): Promise<Database>
}