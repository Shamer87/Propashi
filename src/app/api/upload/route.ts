import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Person from '@/models/Person';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];
    if (!files || files.length === 0) {
      return Response.json({ error: 'Жодного файлу не передано' }, { status: 400 });
    }
    const photoStrings: string[] = [];
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];
    const maxFileSize = 5 * 1024 * 1024; 
    for (const file of files) {
      const fileName = file.name.toLowerCase();
      const fileExt = fileName.slice(fileName.lastIndexOf('.'));
      if (!supportedExtensions.includes(fileExt)) {
        console.warn(`Skipping ${file.name}: unsupported extension ${fileExt}`);
        continue;
      }
      if (file.size > maxFileSize) {
        console.warn(`Skipping ${file.name}: size ${file.size} exceeds ${maxFileSize}`);
        continue;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      let mimeType = 'image/jpeg';
      if (fileExt === '.png') {
        mimeType = 'image/png';
      } else if (fileExt === '.heic' || fileExt === '.heif') {
        mimeType = 'image/heic';
      }
      const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
      photoStrings.push(base64);
      console.log(`Processed ${file.name} (${mimeType})`);
    }
    if (photoStrings.length === 0) {
      return Response.json({ error: 'Не вдалося обробити жодне зображення. Перевірте формат та розмір файлів (макс. 5 МБ).' }, { status: 400 });
    }
    return Response.json({ photos: photoStrings });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Помилка при завантаженні' }, { status: 500 });
  }
}