/** Site footer */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white px-6 py-4 text-center text-xs text-gray-500">
      &copy; {new Date().getFullYear()} AI SaaS Platform
    </footer>
  );
}
