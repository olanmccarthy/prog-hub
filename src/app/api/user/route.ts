import { NextResponse } from 'next/server';
import { AppDataSource } from '@lib/data-source';
import { User } from '@entities/User';

export async function GET() {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  const users = await AppDataSource.getRepository(User).find();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  const data = await req.json();
  const repo = AppDataSource.getRepository(User);
  const user = repo.create(data);
  await repo.save(user);
  return NextResponse.json(user);
}
