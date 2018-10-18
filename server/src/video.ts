import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';

export interface IVideoPart {
	index: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export async function getVideoInfo(videoFilePath: string) {
	const metadata = await new Promise((resolve: (metadata: ffmpeg.FfprobeData) => void, reject: (error: Error) => void) => {
		ffmpeg.ffprobe(videoFilePath, (error: Error, metadata: ffmpeg.FfprobeData) => {
			if (error) {
				reject(error);
			} else {
				resolve(metadata);
			}
		});
	});

	for (let stream of metadata.streams) {
		if (stream.codec_type === 'video') {
			return {
				width: stream.width,
				height: stream.height,
				videoCodec: stream.codec_name,
			};
		}
	}

	console.warn('Couldn\'t determine video dimensions: ' + videoFilePath);
	return {
		width: undefined,
		height: undefined,
		videoCodec: undefined,
	};
}

export function getVideoPreview(videoFilePath: string, destinationDir: string, filename: string) {
	console.log('get preview of video ' + videoFilePath + '; save to ' + destinationDir + '; filename: ' + filename);
	return new Promise<void>((resolve: () => void, reject: (error: Error) => void) => {
		ffmpeg(videoFilePath)
			.on('filenames', (filenames: string[]) => console.log('preview filenames: ' + filenames.join(',')))
			.on('end', resolve)
			.on('error', reject)
			.screenshots({
				count: 1,
				folder: destinationDir,
				filename,
			});
	});
}

export async function cutVideo(
	sourceVideo: string,
	destinationDir: string,
	parts: IVideoPart[],
) {
	const sourceVideoFileName = path.parse(sourceVideo).name;
	const sourceVideoExtension = path.extname(sourceVideo);
	const videoInfo = await getVideoInfo(sourceVideo);
	const result: { [index: number]: string } = {};
	for (let part of parts) {
		const x = videoInfo.width * part.x;
		const y = videoInfo.height * part.y;
		const width = videoInfo.width * part.width;
		const height = videoInfo.height * part.height;
		const filename = sourceVideoFileName + '_' + part.index + sourceVideoExtension;
		const destination = path.join(destinationDir, filename);
		console.log(`crop video; x=${x}, y=${y}, width=${width}, height=${height}`);
		await new Promise<void>((resolve: () => void, reject: (error: Error) => void) => {
			ffmpeg(sourceVideo)
				.videoFilters(`crop=${width}:${height}:${x}:${y}`)
				.output(destination)
				.on('end', () => {
					console.log('finished cuting video part ' + part.index + '; saved in ' + destination);
					resolve();
				})
				.on('error', (error: Error) => {
					console.error('error while cutting video part ' + part.index, error);
					reject(error);
				})
				.run();
		});
		result[part.index] = filename;
	}

	return result;
}
