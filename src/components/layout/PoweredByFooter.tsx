const FOS_URL = 'https://fruitofsustainability.com'

export function PoweredByFooter() {
  return (
    <footer className="flex h-5 shrink-0 items-center justify-center border-t border-[#DEE2E6] bg-[#60BA81] text-[12px] leading-none text-[#ffffff]">
      <span>
        Powered by{' '}
        <a
          href={FOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#284952] underline-offset-2 transition-colors hover:text-[#17161A] hover:underline"
        >
          Fruit of Sustainability
        </a>
      </span>
    </footer>
  )
}
