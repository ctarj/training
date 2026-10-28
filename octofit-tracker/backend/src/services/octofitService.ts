import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function parseObjectId(value: unknown, label: string) {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
    throw Object.assign(new Error(`Invalid ${label}`), { status: 400 });
  }
  return value;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function activityFocus(type: string) {
  const value = type.toLowerCase();
  if (['run', 'cycle', 'swim', 'row', 'jog'].includes(value)) return 'endurance';
  if (['strength', 'lift', 'press', 'squat'].includes(value)) return 'strength';
  if (['walk', 'mobility', 'stretch', 'yoga'].includes(value)) return 'mobility';
  return 'general';
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const userId = parseObjectId(body.userId, 'userId');
  const teamId = parseObjectId(body.teamId, 'teamId');
  const type = normalizeText(body.type);
  const minutes = Number(body.minutes);

  if (!type) throw Object.assign(new Error('Activity type is required'), { status: 400 });
  if (!Number.isFinite(minutes) || minutes <= 0) throw Object.assign(new Error('Activity minutes must be a positive number'), { status: 400 });

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);

  if (!userExists || !teamExists) {
    throw Object.assign(new Error('Unknown user or team reference'), { status: 404 });
  }

  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const name = normalizeText(body.name);
  const mascot = normalizeText(body.mascot);
  if (!name) throw Object.assign(new Error('Team name is required'), { status: 400 });
  if (!mascot) throw Object.assign(new Error('Team mascot is required'), { status: 400 });

  const rawMembers = Array.isArray(body.members) ? body.members : [];
  const members = rawMembers.map((member) => {
    const value = normalizeText(member);
    if (!value || !mongoose.isValidObjectId(value)) {
      throw Object.assign(new Error('Team members must be valid object IDs'), { status: 400 });
    }
    return new mongoose.Types.ObjectId(value);
  });

  const team = await Team.create({ name, mascot, members });
  return team.toObject();
}

export async function getLeaderboard() {
  const rows = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'teamDetails' } },
    { $unwind: '$teamDetails' },
    { $project: { _id: 0, teamName: '$teamDetails.name', totalPoints: 1 } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return rows.map((row, index) => ({
    teamName: row.teamName,
    totalPoints: row.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const email = normalizeText(userEmail);
  if (!email) throw Object.assign(new Error('User email is required'), { status: 400 });

  const user = await User.findOne({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const latestActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const userGoal = normalizeText(user.fitnessGoal).toLowerCase() || 'general';
  const recentType = typeof latestActivity?.type === 'string' ? latestActivity.type.toLowerCase() : '';
  const recentFocus = activityFocus(recentType);
  const preferredFocus = userGoal !== 'general' ? userGoal : recentFocus;

  const workouts = await Workout.find().lean();
  const ranked = workouts.map((workout) => {
    const workoutFocus = normalizeText(workout.focus).toLowerCase();
    let score = 0;
    if (workoutFocus === preferredFocus) score += 10;
    if (workoutFocus === userGoal) score += 5;
    if (workoutFocus === recentFocus && recentFocus !== 'general') score += 3;
    return { workout, score };
  }).sort((left, right) => right.score - left.score || left.workout.title.localeCompare(right.workout.title));

  return ranked.map(({ workout }) => ({
    title: workout.title,
    focus: workout.focus,
    minutes: workout.minutes,
    difficulty: workout.difficulty,
    reason: `Based on your recent ${recentType || 'activity'} and goal to improve ${preferredFocus}, this ${workout.focus} workout is a strong match for your routine.`,
  }));
}

export { User };
