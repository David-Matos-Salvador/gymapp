# Soft-delete evaluation for Cascade models

Models currently using `onDelete: Cascade` that are candidates for soft-delete:

## 1. Booking (line 470-480)

`Cascade` on both `userId` and `classId`.

**Recommendation: ADD soft-delete**
Gyms need booking history for reporting, attendance tracking, and dispute resolution. Deleting a user or class should not wipe all historical booking records.

Suggested approach:

```prisma
model Booking {
  deletedAt DateTime?  // soft-delete flag
}
```

## 2. WorkoutSetLog (line 434-450)

`Cascade` on `workoutLogId` → when a WorkoutLog is deleted, all its sets are cascade-deleted.

**Recommendation: OK as-is (no soft-delete needed)**
If a workout log is deleted, its constituent sets have no independent value. Soft-delete on WorkoutLog itself (not currently cascaded) would be more appropriate.

## 3. RoutineSplitExercise (line 369-382)

`Cascade` on `splitId` and `exerciseId`.

**Recommendation: ADD soft-delete for exerciseId cascade**

- `splitId` cascade is acceptable — if a split is removed, its exercises should go.
- `exerciseId` cascade is risky — if an Exercise template is deleted, all historical RoutineSplitExercise records referencing it disappear. This breaks workout history. Instead, use `onDelete: SetNull` or add soft-delete to Exercise so historical split exercises can still reference a soft-deleted exercise.

## 4. Other cascade models (not in scope but noted)

- `WorkoutLog` cascades from User → consider soft-delete for GDPR/user history
- `Payment` cascades from User → should be soft-deleted for accounting records
- `Membership` cascades from User & MembershipPlan → soft-delete for audit trail
- `CheckIn`, `BodyMeasurement`, `ProgressPhoto` → cascade from User; low-value standalone but consider for data retention policies

## Summary

| Model                | Current cascade  | Add soft-delete?        |
| -------------------- | ---------------- | ----------------------- |
| Booking              | user + class     | **Yes**                 |
| WorkoutSetLog        | workoutLog       | No (cascade fine)       |
| RoutineSplitExercise | split + exercise | **Yes** (exercise side) |
