class Filecat < Formula
  desc "CLI tool that concatenates files with smart comment headers and tree reports"
  homepage "https://github.com/bastianplsfix/filecat"
  version "0.0.1"
  license "MIT"

  on_macos do
    on_intel do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-darwin-x86_64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_DARWIN_X86_64"
    end

    on_arm do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-darwin-aarch64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_DARWIN_AARCH64"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-linux-x86_64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_LINUX_X86_64"
    end
  end

  def install
    if OS.mac?
      if Hardware::CPU.arm?
        bin.install "filecat-darwin-aarch64" => "filecat"
      else
        bin.install "filecat-darwin-x86_64" => "filecat"
      end
    elsif OS.linux?
      bin.install "filecat-linux-x86_64" => "filecat"
    end
  end

  test do
    system "#{bin}/filecat", "--help"
  end
end
