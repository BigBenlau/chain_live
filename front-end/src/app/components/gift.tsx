function Gift() {
  return (
    <div className="mt-6">
      <div className="flex overflow-x-auto gap-4">
        {/* 礼物 1 */}
        <div className="text-center flex-shrink-0">
          <div>
            <img
              src="/gift1.png"
              alt="礼物 1"
              className="w-40 h-40 object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>

        {/* 礼物 2 */}
        <div className="text-center flex-shrink-0">
          <div>
            <img
              src="/gift2.png"
              alt="礼物 2"
              className="w-40 h-40 object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>

        {/* 礼物 3 */}
        <div className="text-center flex-shrink-0">
          <div>
            <img
              src="/gift3.png"
              alt="礼物 3"
              className="w-40 h-40 object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Gift
