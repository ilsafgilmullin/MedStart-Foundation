import Image from 'next/image'
import { UserRound } from 'lucide-react'
import { isTrustedAvatarUrl } from '@/lib/avatar-security'
import { firebasePublicConfig } from '@/lib/firebase-public-config'

export default function ProfilePhoto({
  src,
  size,
  className,
}: {
  src: string
  size: number
  className: string
}) {
  if (!isTrustedAvatarUrl(src, firebasePublicConfig.storageBucket)) {
    return (
      <span
        aria-hidden="true"
        className={`${className} inline-flex items-center justify-center bg-slate-100 text-slate-500`}
      >
        <UserRound style={{ width: size * 0.45, height: size * 0.45 }} />
      </span>
    )
  }

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      referrerPolicy="no-referrer"
      unoptimized
    />
  )
}
