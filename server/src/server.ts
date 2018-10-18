import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as crypto from 'crypto';
import * as express from 'express';
import * as multer from 'multer';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as mkdirp from 'mkdirp';
import {
	IVideoPart,
	getVideoInfo,
	getVideoPreview,
	cutVideo,
} from './video';

const uploadRoot = process.env.upload_root;

function getOriginalVideoDir() {
	return path.join(uploadRoot, 'original');
}

function getVideoPartDir(videoId: string) {
	return path.join(uploadRoot, 'parts', videoId);
}

function getPreviewDir() {
	return path.join(uploadRoot, 'preview');
}

function getUploadedFileUniqueId(filePath: string) {
	return new Promise((resolve: (checksum: string) => void) => {
		const hash = crypto.createHash('md5');
		const stream = fs.createReadStream(filePath);
		stream.on('data', (data: any) => {
			hash.update(data);
		});
		stream.on('end', () => {
			const checksum = hash.digest('hex');
			resolve(checksum);
		});
	});
}

const storage = multer.diskStorage({});
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/video', upload.single('video'), async (request: Express.Request, response: express.Response) => {
	const source = request.file.path;
	const extension = path.extname(request.file.originalname);
	const videoId = await getUploadedFileUniqueId(source);
	const videoIdWithExtension = videoId + extension;
	const destinationDir = getOriginalVideoDir();
	await promisify(mkdirp)(destinationDir);
	const destination = path.join(destinationDir, videoIdWithExtension);

	if (request.file.mimetype.startsWith('video/') && extension) {
		console.log('save video to ' + destination);
		await promisify(fs.rename)(source, destination);
		const { width, height } = await getVideoInfo(destination);
		const previewDestination = getPreviewDir();
		await getVideoPreview(destination, previewDestination, videoId);
		const preview = path.join(previewDestination, videoId);
		response.json({
			width, height, preview, videoId: videoIdWithExtension,
		});
	} else {
		response.sendStatus(400);
	}
});

app.post('/video/:id/cut', async (request: express.Request, response: express.Response) => {
	const videoIdWithExtension = request.params.id;
	const videoId = path.parse(videoIdWithExtension).name;
	const videoPath = path.join(getOriginalVideoDir(), videoIdWithExtension);
	const videoExists = await promisify(fs.exists)(videoPath);

	if (videoExists) {
		const parts = (request.body || []) as IVideoPart[];
		const partsDestination = getVideoPartDir(videoId);
		await promisify(mkdirp)(partsDestination);
		const partIds = await cutVideo(videoPath, partsDestination, parts);
		response.json(partIds);
	} else {
		response.sendStatus(400);
	}
});

const port = process.env.PORT;
app.listen(port);

process.on('uncaughtException', (error: Error) => console.error(error));
process.on('unhandledRejection', (error: Error) => {
	throw error;
});
