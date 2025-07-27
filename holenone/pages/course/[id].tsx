import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface TeeTime {
    time: string;
    price: number;
    players: number;
}

interface ApiResponse {
    teeTimes: TeeTime[];
}

export default function CoursePage() {
    const router = useRouter();
    const { id } = router.query;
    const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);

    useEffect(() => {
        if(id) {
            fetch(`/api/tee-times?courseName=${id}`)
                .then(res=>res.json())
                .then((data: ApiResponse)=>{
                    if(Array.isArray(teeTimes)){
                        setTeeTimes(data.teeTimes);
                        console.log("tee times: " + teeTimes);
                    } else {
                        console.warn("No tee times");
                        setTeeTimes([]);
                    }
                })

        }
    }, [id]);

    const handleBook = async (teeTime: TeeTime) => {
        const res = await fetch("/api/book", {
            method: "POST",
            body: JSON.stringify({ courseId: id, teeTime }),
            headers: { "Content-Type": "application/json" }
        });
        if (res.ok) router.push("/confirmation");
    };

    return (
        <div>
            <h1>Tee Times</h1>
            {teeTimes.length === 0 ? <p>Loading tee times...</p> :
                teeTimes.map((tt, i) => (
                    <div key={i}>
                        <p><strong>Time:</strong> {tt.time}</p>
                        <p><strong>Price:</strong> ${tt.price}</p>
                        <p><strong>Players:</strong> {tt.players}</p>
                        <button onClick={() => handleBook(tt)}>Book This</button>
                    </div>
                ))
            }
        </div>
    )
}