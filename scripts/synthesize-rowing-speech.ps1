param([Parameter(Mandatory=$true)][string]$InputFile,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$synthType=[Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
$streamType=[Windows.Media.SpeechSynthesis.SpeechSynthesisStream,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
$asTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
if(-not $asTask){throw 'WinRT async adapter unavailable'}
$inputData=Get-Content -LiteralPath $InputFile -Raw -Encoding UTF8 | ConvertFrom-Json
$voices=@(@{Key='en';Language='en-US';Name='Microsoft Zira'},@{Key='zh';Language='zh-CN';Name='Microsoft Huihui'})
$results=New-Object System.Collections.Generic.List[object]
foreach($config in $voices){
 $voice=$synthType::AllVoices | Where-Object { $_.DisplayName -eq $config.Name -and $_.Language -eq $config.Language } | Select-Object -First 1
 if(-not $voice){throw "Required voice missing: $($config.Name)"}
 $synth=New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
 $synth.Voice=$voice
 $synth.Options.SpeakingRate=0.95
 $synth.Options.AudioVolume=1.0
 $folder=Join-Path $OutputDirectory $config.Key
 [void][System.IO.Directory]::CreateDirectory($folder)
 try{
  $n=0
  foreach($cue in $inputData){
   $text=$cue.text.($config.Key)
   if([string]::IsNullOrWhiteSpace($text)){throw "Missing text: $($cue.id)"}
   $operation=$synth.SynthesizeTextToStreamAsync($text)
   $task=$asTask.MakeGenericMethod($streamType).Invoke($null,@($operation))
   $task.Wait();$speech=$task.Result
   $read=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($speech)
   $file=[System.IO.File]::Create((Join-Path $folder ($cue.id+'.wav')))
   try{$read.CopyTo($file)}finally{$file.Dispose();$read.Dispose();$speech.Dispose()}
   $results.Add([pscustomobject]@{id=$cue.id;language=$config.Key;locale=$config.Language;voice=$voice.DisplayName;voiceId=$voice.Id})
   $n++
   if($n%10 -eq 0){Write-Output "$($config.Language): $n / $($inputData.Count)"}
  }
 }finally{$synth.Dispose()}
}
$results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutputDirectory 'voices.json') -Encoding UTF8
Write-Output "Synthesized $($results.Count) WAV clips."
