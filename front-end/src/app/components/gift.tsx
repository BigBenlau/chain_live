import { parseEther } from "viem";
import { useSendTransaction } from 'wagmi'

function Gift() {

  const datas = [
    {
      id: 1,
      url: "/gift1.png",
      price: "0.1",
    },
    {
      id: 2,
      url: "/gift2.png",
      price: "0.2",
    },
    {
      id: 3,
      url: "/gift3.png",
      price: "0.3",
    }
  ];

  const { data: hash, sendTransaction } = useSendTransaction()

  function OnItemClick(id: number) {
    console.log(id);

    const data = datas.find(data => data.id === id);
    if (!data) return;

    sendTransaction({
      to: '0x435a345bB8eC10b30738217332216849506aCCcF',
      value: parseEther(data.price),
    })
  }

  return (
    <div className="mt-6 flex flex-col items-center justify-center">
      <div className="flex justify-center gap-4">
        {
          datas.map(data => <GiftItem key={data.id} url={data.url} OnItemClick={OnItemClick} id={data.id} price={data.price} />)
        }
      </div>
      {hash && <div>Transaction Hash: {hash}</div>}
    </div>
  )
}

function GiftItem(props: { id: number, url: string, OnItemClick: (id: number) => void, price: string }) {
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
