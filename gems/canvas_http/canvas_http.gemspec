# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "canvas_http"
  spec.version       = "1.0.0"
  spec.authors       = ["Brian Palmer"]
  spec.email         = ["brianp@instructure.com"]
  spec.summary       = "Canvas HTTP"

  spec.files         = Dir.glob("{lib,spec}/**/*") + %w[Rakefile test.sh]
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  spec.add_dependency "multipart"

  spec.add_development_dependency "bundler", "~> 2.2"
  spec.add_development_dependency "multipart"
  spec.add_development_dependency "rake"
  spec.add_development_dependency "rspec", "~> 3.5.0"
  spec.add_development_dependency "webmock", "1.24.6"
end
