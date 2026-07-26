import Image from 'next/image'

export default function ProfilePhoto({
  src,
  size,
  className,
}: {
  src: string
  size: number
  className: string
}) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  )
}
