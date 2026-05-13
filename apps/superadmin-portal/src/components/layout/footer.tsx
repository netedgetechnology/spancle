interface FooterProps {
  minimal?: boolean;
}

export function Footer({ minimal = false }: FooterProps): React.ReactElement {
  const year = new Date().getFullYear();
  if (minimal) {
    return (
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        &copy; {year} Spancle Sports OS
      </footer>
    );
  }
  return (
    <footer className="border-t border-gray-200 bg-white px-6 py-4">
      <p className="text-xs text-gray-400">&copy; {year} Spancle Sports OS. All rights reserved.</p>
    </footer>
  );
}
