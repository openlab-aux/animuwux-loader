import sqlite from "sqlite3";
import { Mutex } from "async-mutex";
import { exec } from "node:child_process";

const { Database } = sqlite.verbose();

const mutex = new Mutex();

const args = process.argv.slice(2);
const db = new Database(args[0]);

async function downloadMusicFromYt(songId, songUrl) {
  const command = [
    "yt-dlp",
    "-f",
    "bestaudio",
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0",
    songUrl,
    "-o",
    `${songId}/song.mp3`,
  ].join(" ");

  const promise = new Promise((resolve) => exec(command, () => resolve()));
  await promise;
}

db.each("SELECT song_id, song_text FROM animux_songs", (err, row) => {
  mutex.runExclusive(async () => {
    if (err) {
      console.error(`SQLite error: ${err}`);
      process.exit(1);
    }

    const { song_id, song_text } = row;
    const captures = /^#VIDEO:(v|a)=(.+?)(,|$)/m.exec(song_text);
    if (captures === null) {
      return;
    }

    const video_id = captures.at(2);
    if (video_id.length > 15) {
      return;
    }

    await downloadMusicFromYt(song_id, video_id);
  });
});

db.close();
