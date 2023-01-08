import axios from "axios";

export const startSession = async (candidates: number) => {
    axios
        .post("http://localhost:4000/app/refresh", {
            title: "Hello World!",
            body: "This is a new post."
        })
        .then((response) => {
            console.log("SUCCESS AXIOS")
            return {
                props: {response}
            }
        });


}