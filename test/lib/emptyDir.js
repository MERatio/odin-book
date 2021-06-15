const path = require('path');
const fsPromises = require('fs/promises');

async function emptyDir(dir, exclusions = []) {
	const files = await fsPromises.readdir(dir);
	for (const file of files) {
		if (!exclusions.includes(file)) {
			await fsPromises.unlink(path.join(dir, file));
		}
	}
}

module.exports = emptyDir;
