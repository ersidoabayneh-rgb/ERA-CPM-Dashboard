import { Project } from '../types';

export async function fetchDriveDatabase(_token: string): Promise<Project[] | null> {
  // Google Drive Integration is disabled by configuration
  return null;
}

export async function uploadDriveDatabase(_token: string, _projects: Project[]): Promise<boolean> {
  // Google Drive Integration is disabled by configuration
  return false;
}

