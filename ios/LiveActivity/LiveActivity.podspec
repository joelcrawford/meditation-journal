Pod::Spec.new do |s|
  s.name         = 'LiveActivity'
  s.version      = '1.0.0'
  s.summary      = 'Live Activity timer for MeditationJournal'
  s.homepage     = 'https://github.com'
  s.license      = 'MIT'
  s.author       = 'MeditationJournal'
  s.platform     = :ios, '16.4'
  s.source       = { :path => '.' }
  s.source_files = 'LiveActivityModule.{swift,m}'
  s.dependency   'React-Core'
end
