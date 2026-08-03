import { Project } from '../types';

export async function fetchDriveDatabase(token: string): Promise<Project[] | null> {
  try {
    const q = encodeURIComponent("name='ERA_Active_Contracts_Database.json' and trashed=false");
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];
    
    if (existingFile) {
      const fileId = existingFile.id;
      const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (downloadRes.ok) {
        const text = await downloadRes.text();
        const data = JSON.parse(text);
        if (data && Array.isArray(data.projects)) {
          return data.projects;
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch from Drive', err);
  }
  return null;
}

export async function uploadDriveDatabase(token: string, projects: Project[]): Promise<boolean> {
  try {
    const q = encodeURIComponent("name='ERA_Active_Contracts_Database.json' and trashed=false");
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!searchRes.ok) return false;
    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];
    
    const fileContent = JSON.stringify({
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      projects: projects
    }, null, 2);

    const metadata = {
      name: 'ERA_Active_Contracts_Database.json',
      mimeType: 'application/json'
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    if (existingFile) {
      const fileId = existingFile.id;
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });
      return res.ok;
    } else {
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });
      return res.ok;
    }
  } catch (err) {
    console.error('Failed to upload to Drive', err);
    return false;
  }
}
