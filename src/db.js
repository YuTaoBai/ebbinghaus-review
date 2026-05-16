import Dexie from 'dexie'

const db = new Dexie('EbbinghausReview')

db.version(1).stores({
  knowledge: '++id, name, createdAt, reviewStage, nextReviewDate, completed',
})

export default db
