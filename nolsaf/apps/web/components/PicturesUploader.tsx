import React, { useRef } from "react";
import Image from "next/image";

export type PicturesUploaderProps = {
	title: string;
	minRequired?: number;
	images: string[];
	onUpload: (files: FileList | null) => void;
	onRemove: (index: number) => void;
	saved?: boolean[];
	onSave?: (index: number) => void;
	uploading?: boolean[];
	inputId?: string;
};

export default function PicturesUploader({
	title,
	minRequired = 3,
	images,
	onUpload,
	onRemove,
	saved,
	onSave,
	uploading,
	inputId = "picturesUploaderInput",
}: PicturesUploaderProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const uploadedCount = images.length;
	return (
		<div className="grid gap-2">
			<label className="text-sm font-medium">
				{title} <span className="text-red-600">*</span>{" "}
				<span className="text-xs text-gray-500">(Min {minRequired} photos required)</span>
			</label>
			<div className="mt-1 text-xs text-gray-600 mb-2">
				{uploadedCount === 0 ? (
					<span className="text-gray-500 italic">No photos uploaded yet. Add at least {minRequired} photos.</span>
				) : (
					<span>
						{uploadedCount} photo{uploadedCount !== 1 ? "s" : ""} uploaded{" "}
						{uploadedCount < minRequired && (
							<span className="text-red-600 font-medium">(Need {minRequired - uploadedCount} more)</span>
						)}
					</span>
				)}
			</div>

			<div className="flex flex-wrap gap-3">
				{images.map((u, i) => (
					<div
						key={i}
						className={`w-28 h-28 border-2 rounded-lg relative overflow-hidden group transition-colors ${saved?.[i] ? "border-green-500" : "border-gray-200 hover:border-blue-400"}`}
					>
						{uploading?.[i] && (
							<div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
								<div className="flex flex-col items-center gap-1 text-white text-[11px]">
									<div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
									<span>Uploading…</span>
								</div>
							</div>
						)}
						{/* Use Next/Image for http(s); for blob/data, fallback to plain img and suppress linter for LCP warning since it's a small thumbnail */}
						{/^https?:\/\//i.test(u) ? (
							<Image src={u} alt={`${title} ${i + 1}`} width={112} height={112} className="w-full h-full object-cover" />
						) : (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={u} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" />
						)}
						<button
							className="absolute top-1.5 right-1.5 text-[11px] px-2 py-0.5 bg-red-600 text-white rounded-md hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
							onClick={() => onRemove(i)}
							aria-label={`Remove ${title} ${i + 1}`}
						>
							Remove
						</button>
						{onSave && (
							<button
								type="button"
								aria-label={`Save ${title} ${i + 1}`}
								onClick={() => onSave(i)}
								disabled={!!saved?.[i]}
								className={`absolute bottom-1.5 right-1.5 text-[11px] px-2 py-0.5 rounded ${saved?.[i] ? "bg-green-600 text-white cursor-default" : "bg-gray-800/70 text-white hover:bg-gray-900/80"}`}
							>
								{saved?.[i] ? "Saved" : "Save"}
							</button>
						)}
						<div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded">{i + 1}</div>
					</div>
				))}
				<label className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-sm cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-colors gap-2">
					<span className="text-gray-600 font-medium">Browse & Upload</span>
					<input
						id={inputId}
						ref={inputRef}
						type="file"
						accept="image/*"
						multiple
						title={`Upload ${title}`}
						aria-label={`Upload ${title}`}
						className="hidden"
						onChange={(e) => onUpload(e.target.files)}
					/>
				</label>
			</div>
		</div>
	);
}
