class Filecat < Formula
  desc "CLI tool that concatenates files with smart comment headers and tree reports"
  homepage "https://github.com/bastianplsfix/filecat"
  version "0.0.3"
  license "MIT"

  on_macos do
    on_intel do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-darwin-x86_64.tar.gz"
      sha256 "0afa1d2daea2ca9446a2555dc2cc15c815c5b0cdab599827a9b81a8c8c7283a3"
    end

    on_arm do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-darwin-aarch64.tar.gz"
      sha256 "49930a7734d39c48e88e6a252bd416333d3d62b6a5ca43215b50f01538e7c91e"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-linux-x86_64.tar.gz"
      sha256 "5ee50ea180306a4402118e9c5ac168af9ca00b49adffdf8ae6c3b8f5bbddb8b0"
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
