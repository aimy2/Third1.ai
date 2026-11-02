from faster_whisper import WhisperModel

print("Loading Whisper model...")

model = WhisperModel(
    "small",
    device="cuda",
    compute_type="float16"
)

print("Model loaded successfully!")

audio_file = input("Enter the path to your audio file: ")

segments, info = model.transcribe(
    audio_file,
    beam_size=5,
    vad_filter=True
)

print("\nDetected language:", info.language)
print("Language probability:", info.language_probability)

print("\nTranscription:")

for segment in segments:
    print(segment.text, end=" ")

print("\n\nTranscription complete!")