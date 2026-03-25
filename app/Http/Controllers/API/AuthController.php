<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;


class AuthController extends Controller
{
    
    // Register new user and return token
    public function register(RegisterRequest $request)
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = JWTAuth::fromUser($user);

        return $this->respondWithToken($token, new UserResource($user));
    }



    // Login user and return token
    public function login(LoginRequest $request)
    {
        $credentials = $request->only('email', 'password');

        if (!$token = JWTAuth::attempt($credentials)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid credentials'
            ], 401);
        }

        $user = Auth::user();

        return $this->respondWithToken($token, new UserResource($user));
    }


    // Return authenticated user info

    public function user()
    {   
        // $user = $request->user();
        $user = auth('api')->user();
        return response()->json([
            'status' => 'success',
            'data' => new UserResource($user)
        ]);
    }

    // Logout (invalidate token)
    
    public function logout()
    {
        JWTAuth::invalidate(JWTAuth::getToken());

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out'
        ]);
    }

    // 🔥 REFRESH TOKEN
    public function refresh()
    {
        try {
            // $newToken = JWTAuth::refresh(JWTAuth::getToken());
            $newToken = JWTAuth::parseToken()->refresh();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'token' => $newToken
                ]
            ]);
        } catch (JWTException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Token refresh failed'
            ], 401);
        }
    }

    // 🔁 Helper
    protected function respondWithToken($token, $user)
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'expires_in' => auth('api')->factory()->getTTL() * 60,
                // 'expires_in' => JWTAuth::factory()->getTTL(),
                // 'expires_in' => auth()->factory()->getTTL() * 60
            ]
        ]);
    }
}
