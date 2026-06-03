Pod::Spec.new do |s|
  s.name         = 'BellSound'
  s.version      = '1.0.0'
  s.summary      = 'Native bell sound playback for MeditationJournal'
  s.homepage     = 'https://github.com'
  s.license      = 'MIT'
  s.author       = 'MeditationJournal'
  s.platform     = :ios, '16.4'
  s.source       = { :path => '.' }
  s.source_files = '*.{h,m}'
  s.frameworks   = 'AVFoundation'
  s.dependency   'React-Core'
end
