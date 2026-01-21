class Filecat < Formula
  desc "CLI tool that concatenates files with smart comment headers and tree reports"
  homepage "https://github.com/bastianplsfix/filecat"
  version "0.0.4"
  license "MIT"

  on_macos do
    on_intel do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-darwin-x86_64.tar.gz"
      sha256 "7992d760e186b1daa81871ef5b65d2151c46cb2e18b8d718da657c529cb7ac14"
    end

    on_arm do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-darwin-aarch64.tar.gz"
      sha256 "6e2d14edac5c52957746d36114a4bae76a669aaadbac23cc96714c03d74ed748"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-linux-x86_64.tar.gz"
      sha256 "a1e3d9d0954cdac4c85b53747cc1f0ded4de8a0d305b98c34289ed4ec6b58705"
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
