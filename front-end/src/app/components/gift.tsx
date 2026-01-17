function Gift() {

  const datas = [
    {
      id: 1,
      url: "/gift1.png",
      price: 1,
    },
    {
      id: 2,
      url: "/gift2.png",
      price: 5,
    },
    {
      id: 3,
      url: "/gift3.png",
      price: 20,
    }
  ];

  function OnItemClick(id: number) {
    console.log(id);
  }

  return (
    <div className="mt-6">
      <div className="flex overflow-x-auto gap-4">
        {
          datas.map(data => <GiftItem key={data.id} url={data.url} OnItemClick={OnItemClick} id={data.id} price={data.price} />)
        }
      </div>
    </div>
  )
}

function GiftItem(props: { id: number, url: string, OnItemClick: (id: number) => void, price: number }) {
  return (
    <div className="text-center flex-shrink-0">
      <div>
        <img
          src={props.url}
          alt="礼物 url"
          className="w-40 h-40 object-contain rounded-lg shadow-lg"
          onClick={() => props.OnItemClick(props.id)}
        />
        <p className="text-white text-sm mt-2">MON:{props.price}</p>
      </div>
    </div>
  )
}

export default Gift
