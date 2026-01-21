class Filecat < Formula
  desc "CLI tool that concatenates files with smart comment headers and tree reports"
  homepage "https://github.com/bastianplsfix/filecat"
  version "0.0.2"
  license "MIT"

  on_macos do
    on_intel do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-darwin-x86_64.tar.gz"
      sha256 "b84fa91b27215a925aedef590da08574b4256ff193b636c2a63b36c23c5ff783"
    end

    on_arm do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-darwin-aarch64.tar.gz"
      sha256 "6f1a982a63bd7cc9d523a7bfcafa78be44245ba6c0372bf52368a6b7413a9251"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/bastianplsfix/filecat/releases/download/v#{version}/filecat-linux-x86_64.tar.gz"
      sha256 "ff9563cb670a3a03da66e6aa5ff141696b0473a79afff8c67e8ed3639516d594"
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
