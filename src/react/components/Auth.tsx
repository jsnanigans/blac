import {useBloc} from "../state";
import AuthBloc, {AuthEvent} from "../bloc/AuthBloc";
import {Button, ButtonGroup, Card, CardContent, Typography} from "@material-ui/core";
import React from "react";
import Divider from "@material-ui/core/Divider";

export default function Auth() {
    const [data, auth] = useBloc<AuthBloc>(AuthBloc);
    return <Card >
        <CardContent>
            <Typography>data: {JSON.stringify(data)}</Typography>
            <ButtonGroup>
                <Button onClick={() => auth.add(AuthEvent.authenticated)}>Login</Button>
                <Button onClick={() => auth.add(AuthEvent.unknown)}>Unknown</Button>
                <Button onClick={() => auth.add(AuthEvent.unauthenticated)}>logout</Button>
            </ButtonGroup>
        </CardContent>
    </Card>
}