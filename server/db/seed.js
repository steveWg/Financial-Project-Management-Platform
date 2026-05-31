import { initialDictionaries, initialProjects, initialUsers } from '../../src/data/mock.js'
import { saveProjectRecord, saveUserRecord, addDictionaryValue } from '../repositories/projectRepository.js'

export function seedDatabase(db) {
  const existing = db.prepare('select count(*) as count from projects').get().count
  if (existing > 0) return

  db.exec('begin')
  try {
    initialUsers.forEach((user) => saveUserRecord(db, user))
    Object.entries(initialDictionaries).forEach(([type, values]) => {
      values.forEach((value) => addDictionaryValue(db, type, value))
    })
    initialProjects.forEach((project) => saveProjectRecord(db, project))
    db.exec('commit')
  } catch (error) {
    db.exec('rollback')
    throw error
  }
}
