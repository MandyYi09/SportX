# Clean source package

Includes current application source, tests, scripts, expert motion reference assets, synthesized speech and documentation.

Excludes Git history, local configuration, certificates/private keys, caches, browser profiles, generated builds, old snapshots, audit outputs, personal recordings, learner pose/score JSON and screenshots.

Run with Node.js: `npm run dev`. Checks: `npm test`; build: `npm run build`. No npm dependencies are required for these commands. Runtime CDN libraries and the pose model require internet access on first use.

Browser checks require Chrome. Set CHROME_PATH for your installation. Checks that inspect encoded video require ffmpeg/ffprobe on PATH, or FFMPEG_PATH/FFPROBE_PATH. Image/video replay checks require sample media supplied by you; none is bundled. Optional capture/audio regeneration scripts require their documented external tools.
