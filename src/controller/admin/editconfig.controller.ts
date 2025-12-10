import { Request, Response } from 'express';

export const updateSolo = async (req: Request, res: Response) => {
    const dataFromclient = req.body;
    try {
        // 
        console.log("req.body : ",dataFromclient);
        
        res.status(200).json(dataFromclient);
    } catch (err) {
        console.log(err);
        res.status(400).json({ err });
    }
};

export const updateDaily = async (req: Request, res: Response) => {
    const {  } = req.body;
    try {
        res.status(200).send("test");
    } catch (err) {
        console.log(err);
        res.status(400).json({ err });
    }
};

export const updateInstant = async (req: Request, res: Response) => {
    const {  } = req.body;
    try {
        res.status(200).send("test");
    } catch (err) {
        console.log(err);
        res.status(400).json({ err });
    }
};

export const updateQuestionConfig = async (req: Request, res: Response) => {
    const {  } = req.body;
    try {
        res.status(200).send("test");
    } catch (err) {
        console.log(err);
        res.status(400).json({ err });
    }
};

export const updateAddConfig = async (req: Request, res: Response) => {
    const {  } = req.body;
    try {
        res.status(200).send("test");
    } catch (err) {
        console.log(err);
        res.status(400).json({ err });
    }
};

export const updateLifeline = async (req: Request, res: Response) => {
    const {  } = req.body;
    try {
        res.status(200).send("test");
    } catch (err) {
        console.log(err);
        res.status(400).json({ err });
    }
};
