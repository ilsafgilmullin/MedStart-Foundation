import assert from 'node:assert/strict'
import { canApplyRealtimeElement } from '../artifacts/medstart/lib/live-whiteboard.ts'

const tutor = { authorUid: 'tutor-1' }
const student = { authorUid: 'student-1' }

assert.equal(canApplyRealtimeElement(undefined, tutor, 'tutor-1'), true)
assert.equal(canApplyRealtimeElement(null, student, 'student-1'), true)
assert.equal(canApplyRealtimeElement(undefined, tutor, 'student-1'), false)
assert.equal(canApplyRealtimeElement(tutor, tutor, 'tutor-1'), true)
assert.equal(canApplyRealtimeElement(tutor, student, 'student-1'), false)
assert.equal(canApplyRealtimeElement(student, tutor, 'tutor-1'), false)
assert.equal(canApplyRealtimeElement(student, student, 'student-1'), true)

console.log('Live whiteboard author-collision security tests passed.')
