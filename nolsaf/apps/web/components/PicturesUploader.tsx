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
	const requiredProgress = Math.min(100, (uploadedCount / Math.max(1, minRequired)) * 100);
	return (
		<div className="grid gap-3">
			<div>
				<div className="flex items-center justify-between gap-3">
					<label className="text-sm font-bold text-gray-900">{title} <span className="text-red-600">*</span></label>
					<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${uploadedCount >= minRequired ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
						{uploadedCount} / {minRequired} added
					</span>
				</div>
				<p className="mt-1 text-xs text-gray-500">
					{uploadedCount >= minRequired ? "Minimum reached. You can add more photos." : "Add clear photos showing the bed, room space, and bathroom."}
				</p>
				<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
					<div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${requiredProgress}%` }} />
				</div>
			</div>

			<div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<label className="h-48 w-48 shrink-0 snap-start border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-xl flex flex-col items-center justify-center text-sm cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all gap-2 shadow-inner">
					<div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-emerald-600 text-lg font-semibold">+</div>
					<span className="text-gray-700 font-semibold">Browse & Upload</span>
					<span className="text-[11px] text-gray-500">JPG, PNG, WEBP</span>
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
				{images.map((u, i) => (
					<div
						key={i}
						className={`h-48 w-48 shrink-0 snap-start border-2 rounded-lg relative overflow-hidden group transition-colors ${saved?.[i] ? "border-green-500" : "border-gray-200 hover:border-blue-400"}`}
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
							<Image src={u} alt={`${title} ${i + 1}`} width={192} height={192} className="w-full h-full object-cover" style={{ width: "100%", height: "100%" }} />
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
						{!onSave && saved?.[i] && !uploading?.[i] && (
							<span className="absolute bottom-1.5 right-1.5 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
								Uploaded
							</span>
						)}
						<div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded">{i + 1}</div>
					</div>
				))}
			</div>
		</div>
	);
}
