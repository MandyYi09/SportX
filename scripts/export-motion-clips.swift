// Local macOS helper: export the supplied JSON manifest without changing source files.
// Each entry contains input, output, poster, start and end (seconds in the original video).
import Foundation
import AVFoundation
import AppKit
struct Clip: Decodable { let input: String; let output: String; let poster: String; let start: Double; let end: Double }
let clips = try JSONDecoder().decode([Clip].self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
for clip in clips {
 let asset = AVURLAsset(url: URL(fileURLWithPath: clip.input))
 guard let exporter = AVAssetExportSession(asset: asset, presetName: AVAssetExportPreset1280x720) else { fatalError("Export unavailable") }
 let out = URL(fileURLWithPath: clip.output)
 try FileManager.default.createDirectory(at: out.deletingLastPathComponent(), withIntermediateDirectories: true)
 if FileManager.default.fileExists(atPath:out.path) { try FileManager.default.removeItem(at:out) }
 exporter.outputURL=out; exporter.outputFileType = .mp4; exporter.shouldOptimizeForNetworkUse=true
 exporter.timeRange=CMTimeRange(start:CMTime(seconds:clip.start,preferredTimescale:600),end:CMTime(seconds:clip.end,preferredTimescale:600))
 let done=DispatchSemaphore(value:0)
 exporter.exportAsynchronously { done.signal() }
 done.wait()
 guard exporter.status == .completed else { fatalError("Export failed: \(String(describing:exporter.error))") }
 let generator=AVAssetImageGenerator(asset:asset);generator.appliesPreferredTrackTransform=true;generator.maximumSize=CGSize(width:1280,height:720)
 let cg=try generator.copyCGImage(at:CMTime(seconds:clip.start,preferredTimescale:600),actualTime:nil)
 let rep=NSBitmapImageRep(cgImage:cg)
 try rep.representation(using:.jpeg,properties:[.compressionFactor:0.8])!.write(to:URL(fileURLWithPath:clip.poster))
 print("Exported \(out.lastPathComponent): \(clip.end-clip.start)s")
}
